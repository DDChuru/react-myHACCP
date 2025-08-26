import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Chip,
  DataTable,
  ProgressBar,
  Banner,
  Badge,
  Surface,
  Divider,
  Avatar,
  List,
  Snackbar,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
  IconButton,
  AnimatedFAB,
  Text,
  useTheme,
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Calendar } from 'react-native-calendars';
import LottieView from 'lottie-react-native';
import { haccpStyles } from '../theme/paperTheme';

const { width } = Dimensions.get('window');

const UIShowcase = () => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('dashboard');
  const [isExtended, setIsExtended] = useState(true);

  // Sample data for charts
  const temperatureData = {
    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [{
      data: [2, 3, 4, 5, 4, 3],
      color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const auditData = [
    { name: 'Passed', count: 45, color: haccpStyles.audit.completed, legendFontColor: '#7F7F7F' },
    { name: 'Failed', count: 8, color: haccpStyles.audit.failed, legendFontColor: '#7F7F7F' },
    { name: 'Pending', count: 12, color: haccpStyles.audit.pending, legendFontColor: '#7F7F7F' },
  ];

  const ccpData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      data: [20, 45, 28, 80, 99],
    }],
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        onScroll={({ nativeEvent }) => {
          setIsExtended(nativeEvent.contentOffset.y <= 0);
        }}
      >
        {/* Segmented Control */}
        <Surface style={styles.surface} elevation={1}>
          <SegmentedButtons
            value={selectedSegment}
            onValueChange={setSelectedSegment}
            buttons={[
              { value: 'dashboard', label: 'Dashboard', icon: 'view-dashboard' },
              { value: 'audits', label: 'Audits', icon: 'clipboard-check' },
              { value: 'alerts', label: 'Alerts', icon: 'bell' },
            ]}
          />
        </Surface>

        {/* Banner Alert */}
        <Banner
          visible={true}
          actions={[
            { label: 'Dismiss', onPress: () => {} },
            { label: 'View Details', onPress: () => {} },
          ]}
          icon="alert-circle"
          style={[styles.banner, { backgroundColor: theme.colors.errorContainer }]}
        >
          <Text variant="titleMedium">Critical Temperature Alert</Text>
          <Text variant="bodyMedium">Freezer Unit 3 exceeded safe temperature range</Text>
        </Banner>

        {/* Dashboard Cards */}
        <View style={styles.cardRow}>
          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Avatar.Icon size={40} icon="thermometer" style={{ backgroundColor: haccpStyles.temperature.safe }} />
                <Badge size={24} style={styles.badge}>3</Badge>
              </View>
              <Title>Temperature</Title>
              <Paragraph>All units operating normally</Paragraph>
              <ProgressBar progress={0.85} color={haccpStyles.temperature.safe} style={styles.progressBar} />
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Avatar.Icon size={40} icon="shield-check" style={{ backgroundColor: haccpStyles.ccp.safe }} />
                <Badge size={24} style={[styles.badge, { backgroundColor: haccpStyles.ccp.warning }]}>!</Badge>
              </View>
              <Title>CCPs</Title>
              <Paragraph>2 points need attention</Paragraph>
              <ProgressBar progress={0.6} color={haccpStyles.ccp.warning} style={styles.progressBar} />
            </Card.Content>
          </Card>
        </View>

        {/* Temperature Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Temperature Monitoring</Title>
            <LineChart
              data={temperatureData}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.colors.primary,
                labelColor: (opacity = 1) => theme.colors.onSurface,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Audit Summary Data Table */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Audits</Title>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Location</DataTable.Title>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title numeric>Score</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              <DataTable.Row>
                <DataTable.Cell>Kitchen A</DataTable.Cell>
                <DataTable.Cell>Today</DataTable.Cell>
                <DataTable.Cell numeric>95%</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="flat" textStyle={{ fontSize: 12 }} style={{ backgroundColor: theme.colors.successContainer }}>
                    Passed
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>

              <DataTable.Row>
                <DataTable.Cell>Storage B</DataTable.Cell>
                <DataTable.Cell>Yesterday</DataTable.Cell>
                <DataTable.Cell numeric>78%</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="flat" textStyle={{ fontSize: 12 }} style={{ backgroundColor: theme.colors.warningContainer }}>
                    Review
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>

              <DataTable.Row>
                <DataTable.Cell>Prep Area</DataTable.Cell>
                <DataTable.Cell>2 days ago</DataTable.Cell>
                <DataTable.Cell numeric>62%</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="flat" textStyle={{ fontSize: 12 }} style={{ backgroundColor: theme.colors.errorContainer }}>
                    Failed
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        {/* Audit Statistics Pie Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Audit Statistics</Title>
            <PieChart
              data={auditData}
              width={width - 60}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </Card.Content>
        </Card>

        {/* CCP Compliance Bar Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Weekly CCP Compliance</Title>
            <BarChart
              data={ccpData}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.colors.secondary,
                labelColor: (opacity = 1) => theme.colors.onSurface,
                barPercentage: 0.7,
              }}
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Task List */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Today's Tasks</Title>
            <List.Section>
              <List.Item
                title="Morning Temperature Check"
                description="Check all refrigeration units"
                left={() => <List.Icon icon="checkbox-marked-circle" color={haccpStyles.audit.completed} />}
                right={() => <Text variant="labelSmall">Completed</Text>}
              />
              <List.Item
                title="Sanitization Audit"
                description="Kitchen deep clean verification"
                left={() => <List.Icon icon="clock-outline" color={haccpStyles.audit.inProgress} />}
                right={() => <Text variant="labelSmall">In Progress</Text>}
              />
              <List.Item
                title="Supplier Verification"
                description="Review incoming shipment documentation"
                left={() => <List.Icon icon="alert-circle" color={haccpStyles.audit.requiresAction} />}
                right={() => <Text variant="labelSmall">Pending</Text>}
              />
            </List.Section>
          </Card.Content>
        </Card>

        {/* Calendar for Scheduling */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Audit Schedule</Title>
            <Calendar
              markedDates={{
                '2025-08-25': { marked: true, dotColor: haccpStyles.audit.completed },
                '2025-08-27': { marked: true, dotColor: haccpStyles.audit.pending },
                '2025-08-30': { marked: true, dotColor: haccpStyles.audit.requiresAction },
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurface,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceDisabled,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onPrimary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                indicatorColor: theme.colors.primary,
              }}
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                icon="clipboard-plus"
                onPress={() => setDialogVisible(true)}
                style={styles.button}
              >
                New Audit
              </Button>
              <Button
                mode="contained"
                icon="alert"
                onPress={() => setVisible(true)}
                style={[styles.button, { backgroundColor: theme.colors.error }]}
              >
                Report Issue
              </Button>
            </View>
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                icon="file-document"
                onPress={() => {}}
                style={styles.button}
              >
                View Reports
              </Button>
              <Button
                mode="outlined"
                icon="cog"
                onPress={() => {}}
                style={styles.button}
              >
                Settings
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Sample Form Input */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Temperature Entry</Title>
            <TextInput
              label="Temperature (°C)"
              mode="outlined"
              keyboardType="numeric"
              left={<TextInput.Icon icon="thermometer" />}
              right={<TextInput.Affix text="°C" />}
              style={styles.input}
            />
            <TextInput
              label="Location"
              mode="outlined"
              left={<TextInput.Icon icon="map-marker" />}
              style={styles.input}
            />
            <Button mode="contained" onPress={() => {}} style={styles.submitButton}>
              Submit Reading
            </Button>
          </Card.Content>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <AnimatedFAB
        icon="plus"
        label="New Entry"
        extended={isExtended}
        onPress={() => {}}
        style={styles.fab}
        uppercase={false}
      />

      {/* Snackbar */}
      <Portal>
        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={3000}
          action={{
            label: 'Undo',
            onPress: () => {},
          }}
        >
          Issue reported successfully
        </Snackbar>

        {/* Dialog */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Start New Audit</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Select the type of audit you want to perform:</Paragraph>
            <View style={styles.chipContainer}>
              <Chip icon="food" mode="outlined" onPress={() => {}}>Food Safety</Chip>
              <Chip icon="broom" mode="outlined" onPress={() => {}}>Sanitation</Chip>
              <Chip icon="thermometer" mode="outlined" onPress={() => {}}>Temperature</Chip>
              <Chip icon="truck" mode="outlined" onPress={() => {}}>Supplier</Chip>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => setDialogVisible(false)}>Start</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  surface: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  banner: {
    marginBottom: 16,
    borderRadius: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#10b981',
  },
  progressBar: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  input: {
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default UIShowcase;